# Revisão da R18 final — o que ainda falta fora do plano19

Método: leitura de plano19/ideias19/integration18 + código dos módulos novos; sondagem por simulação (tsx, scripts temporários já apagados, repo intocado):
- `playbot16.playMonth('balanced')` em 1889 (2 partidas × 20 anos, selo): sobrevive nas duas.
- `bot.ts botMonth` (bot simples) em 1889/1960/2000 (selo), 1889/1960 (artista) e 2000 (híbrido): 2 partidas cada, até 25 anos.
- Contei fatos (`onFact('*')`), tipos de mensagem da Caixa (amostrada todo mês, dedup por id), decisões abertas e ecos.
- Limite: amostras pequenas (poucas partidas, 1889 só com playbot). "Nunca disparou" = não apareceu nessas ~16 partidas, não "inalcançável".
- Cada item foi conferido por grep em `docs/plano19.md`. Quando já há algo parecido no plano, escrevo "parcial" e digo o que falta.
- Esforço: S, M ou L. Frente = frente do plano19.

---
## A. Arestas dos merges (duplicação, ruído, silêncio)

**A1. Os ecos cobrem só 6% das opções de decisão.**
- Evidência: 485 EventDefs, 1315 opções. Só 49 eventos (82 opções) têm `registerConseq18`. Por prefixo: `core` 8/101, `d18` 11/11, `r11` 0/87, `w4` 0/18, `org12` 0/15, `era8` 0/14.
- Efeito: a maioria das cartas mostra "Agora" e "Depois" vazio. Em 40 anos de 1889 com playbot só 167 ecos dispararam (~4/ano).
- Plano: P3/"Recibo de decisão" (Frente 8) generaliza o `review18` para o efeito real. Não cobre cobertura de ecos.
- Fix:
  - (1) Teste que lista eventos sem eco e fixa um piso por prefixo.
  - (2) Eco padrão derivado do tipo da opção. Ex.: opção `tone: risky` volta como fato `risk_paid` ou `risk_lost`.
  - (3) Escrever ecos à mão nos 40 eventos mais sorteados. Em 1889 o topo é `controversial_remark`, `poach_attempt`, `stock_out`, `fan15_vault`, `boycott`.
- Frente 8 + Frente 1 (decide18). Liga: `facts17`, `holds17`, `scandal17`, `explain18 dec18.odds`. Esforço: M (infra) + M (conteúdo).

**A2. O barramento de fatos está afogado por poucos tipos e a maioria não tem ouvinte.**
- Evidência, 1889, playbot, 40 anos:
  - `chart` 13.598 fatos (~340/ano), `situation` 1.146, `relic` 735, `release` 636, `release_review` 560, `memory` 604, `statement` 571.
  - `FACT_CAP = 600`: `chart` sozinho enche o anel em ~2 anos, e fatos raros e graves saem junto.
  - `onFact('relic'|'situation'|'rise'|'masterwork'|'hologram'|'echo')` = 0 ouvintes (grep).
- Plano: 0.2 (matriz Fato → consumidores) cobre os ouvintes. Não cobre volume nem o anel.
- Fix:
  - (1) `chart` só entra como fato em marcos: entrou no Top 10, #1, saiu, recorde. O restante vira agregado no mês.
  - (2) Anel por severidade, com cota por `kind`.
  - (3) Dar ouvintes concretos: `relic` → `heirs8`/leilão/museu; `hologram` → cine18 e `rights18`; `echo` → cine18 (ver B1); `situation` → `dm18` (fôlego).
- Frente 0 (0.2). Liga: tudo que lê `recentFacts`, incluindo cine18 e `why18`. Esforço: S-M.

**A3. A Caixa continua barulhenta: ~65 mensagens/ano no jogador equilibrado, e uma só fonte pode dominar.**
- Evidência, 1889 playbot, 40 anos (2.600 mensagens):

| Tipo | Mensagens |
|---|---|
| `review18` | 560 |
| `agency18` | 439 |
| `analyst` | 300 |
| `market18` | 298 |
| `feat8` | 189 |
| `traj18` | 184 |
| `echo18` | 167 |
| `disc18_demo` | 166 |
| `live18` | 156 |

- Artista em 1960 (bot, 2×20 anos): `a18_offer` = 778 (~19/ano); 1889: 490 em uma partida.
- Plano: Frente 8 tem "orçamento de notificações" sem números nem regra.
- Fix:
  - (1) Resumo semanal agrupado por tipo. `review18`, `traj18`, `market18`, `analyst` e `live18` viram um item "Boletim", com expansão.
  - (2) `a18_offer`: no máximo 1 oferta aberta por selo e 3 no total. Reoferta só se mudar algo (fama, hit). Hoje o `r.chance` roda todo mês.
  - (3) Orçamento por categoria em `items18` (cat → N/semana). O excedente vai para o arquivo sem avisar.
- Frente 8. Liga: `inbox18`, `artist18`, `agency18`, `review18`. Esforço: M.

**A4. Tipos de mensagem registrados que não apareceram em ~16 partidas.**
- Lista (25 dos 74 registrados com `registerInboxKind`; nunca apareceram): `a18_ar`, `a18_buried`, `a18_deliver`, `a18_drop`, `a18_info`, `a18_merge`, `a18_show`, `a18_stmt`, `ai18_fake`, `ai18_suit`, `camps18_cut`, `deal_dev/imp/jv`, `disc18_hot/more`, `fans18`, `fest18`, `idols18_*`, `kpop18_*`, `live18`, `media18_viral`, `policy18`, `press18_*`, `radio18_leak`, `radio_payola`, `regions18`, `screen18_late/ost`, `sess18_*`, `soc18_*`, `st18_*`, `supply_*`, `world18_invest`.
- Parte é dependente de role/era (K-pop, IA, rádio, suprimentos). O bot não faz payola, `deals` nem festivais.
- Fix: teste "cobertura de caixa". Um playbot por era e role (3 starts × 3 roles × 10 anos) que falha se um tipo registrado tiver 0 disparos em N partidas, ou que exige whitelist com motivo. Entra no lote 0.3.
- Frente 0 (0.2/0.3). Esforço: S.

**A5. Cockpit empilhado.**
- Evidência: o cockpit tem a barra + `home18` (letreiro, semanas, momentos, humor, pulso, holofote) + miniatura do campus + Caixa + Mesa. A Mesa recebe 11 `registerSection('desk')`: links18, project12, capacity14, eras8, eras12, world4, long18, careers12, hubs8, stories8, pacing8.
- Plano: "Três perguntas no topo" (8) cobre o topo, não a pilha de seções da Mesa.
- Fix: seções da Mesa com ordem e recolhimento persistente. Só 3 abertas por padrão, as demais viram faixa "Mais (8)". Cada `registerSection` declara `weight` e `when`: só aparece se tiver conteúdo.
- Frente 8. Esforço: S-M.

**A6. `simulate()` + `botMonth` (bot.ts) é um espantalho.**
- Evidência: 6/6 partidas de selo quebram em 2–4 anos (1889, 1960 e 2000: `insolvency` em 1891-92, 1963-64, 2002). `playbot16` balanced sobrevive 20 anos em 1889.
- `docs/strategies18.md` e `tools/headless.ts` usam `simulate`. Quem usar `headless` para equilíbrio vai medir uma falência de ~100%.
- Fix: `tools/headless.ts` chama `simulatePlayer` por padrão, com `--bot simple` opcional. O teste de equilíbrio falha se usar o bot simples.
- Frente 0 (0.3). Esforço: S.

**A7. Ecos e dicas dependem da Mesa ter espaço.**
- `follow18` recusa abrir carta se `decisions.length >= 6` (silêncio) e `st.q` corta os mais antigos acima de 80 ecos.
- Fix: carta recusada vira mensagem na Caixa (com prazo), não some. O corte de `q` registra "eco perdido" no `done`, para o recibo (P3) mostrar.
- Frente 8 (P3). Esforço: S.

---
## B. Lacunas de integração entre as peças novas da R18

**B1. Ecos × cenas (decide18 × cine18): cine18 não conhece decide18.**
- Evidência: cine18 só enfileira storyboard para 5 tipos (`PLACE18`: soldout, festival, premiere, verdict, musicshow). `number1`, `signing`, `hall`, `funeral` só gravam no álbum. Nenhum import de `decide18`/`echoes18`. Fato `echo` tem 0 ouvintes.
- Plano: Frente 1 diz "cena lê o estado" e "decide18 registra a consequência como fato". Não liga o eco à cena.
- Ideia: eco com `tone` forte (a promessa quebrada que explode, o vazamento que cai, o show que dá errado por causa da escolha de 6 meses atrás) enfileira cena menor com o fio "você escolheu X". A cena abre no cartão do eco ("Ver a cena"). Escolhas que abrem uma cerimônia (fit do tapete vermelho, discurso) devolvem eco.
- Liga: `Fx18` + `queueScene`, `thread18`, `chooseFit18`. Frentes 1 e 8. Esforço: M.

**B2. Espólio × contratos de artist18: sem ligação.**
- Evidência: `post18` tem `estate18` com herdeiros, disputa e legado. Nada em `artist18.ts`/`shared18.ts` lê `estate`, `heir` ou `deceased`; `alive()` só filtra. Contrato, master e reversão de um ato morto não vão para o espólio, e a sociedade de bandas não paga herdeiros.
- Plano: Frente 4 e Frente 1 ("direitos × espólio × herdeiros × hologramas") cobrem `neural` e `rights18`. Não citam contratos 18 nem sociedades.
- Fix:
  - (1) Ato morto sob contrato: rescisão por morte, com cláusula de pessoa-chave (liga ao M17 de seguro) e opção do selo de lançar o disco póstumo.
  - (2) Master "volta em N anos" passa ao espólio, que decide em `heirs8`.
  - (3) A divisão da sociedade (igual / quem compõe / líder) continua pagando o herdeiro.
  - (4) Projeto póstumo de `post18` exige assinatura do selo detentor do contrato.
- Frentes 3 e 4. Liga: `heirs8`, `rights18`, `contracts18`, `ledger18`, `post18`. Esforço: M.

**B3. era1889 × decide18/home18/Conselheiro: a era não fala com a camada de decisão.**
- Evidência: `era1889.ts` tem 1 `pushInbox18` (`era1889_patent`, 2 disparos em 40 anos) e nenhum `registerConseq18`, `registerAdvisorTip` ou `registerExplain`. Eventos da era (`shellac_breakage` 11×, `shellac_ration`, `hologram_tour`) não têm eco. `home18` não tem nenhuma referência a ano ou era (grep vazio): no letreiro de 1889 não aparece "guerra de patentes", "pool", "pânico de 1893".
- Marcos 1889–1919 (`panic93`, `berliner`, `pool`, `copyright`...) são texto de linha do tempo, sem decisão. A Frente 2 (marcos com escolha) cobre isso em geral, mas não ligou ao cockpit.
- Fix:
  - (1) `registerAdvisorTip('era1889')`: "Pânico em 2 meses: reserve caixa", "patente expira: prense em goma-laca".
  - (2) `home18` ganha card "A era" com os 2–3 fatores vivos (pânico, guerra de formato, imposto).
  - (3) Ecos para `shellac_*` e licença/patente: licenciar pagando hoje ou arriscar e ser processado em 3–9 meses.
- Frentes 2 e 8. Liga: `dec18`, `inbox18`, `supply18`, `rights18`, `history15`. Esforço: M.

**B4. era1889 × artist18: contrato com cara de 1960.**
- Evidência (amostra real, ano 1889, artista): "Adiantamento $143 + fundo de gravação $167; royalty 18%; 2,5 anos (2 discos, 1 opção); master: seu". "Master" volta em 10 anos, "360", "discos" e conta anual são anacronismos. Em 1889 pagava-se cachê por sessão ou por cilindro; royalty sobre disco só vem na década de 1900 (Caruso, ~1903+) e o direito mecânico em 1909. `artist18.ts` não importa `era1889`.
- Fix: pacote de contrato por era. Antes de ~1903: cachê por sessão, exclusividade de selo e cilindro, sem royalty, sem master. 1903–1925: royalty baixo por lado e edição (partitura) separada. O "360" só depois de 2002 (já está), e o termo "master" só depois de ~1925.
- Frentes 3 e 2. Liga: `contracts18`, `rights18` (direito mecânico 1909), `supply18`. Esforço: S-M.

**B5. Campus ("Nosso mundo") × decisões: obras sem escolha e sem eco.**
- Evidência: `campus18` só usa `pushInbox18` (obra entregue/atrasada/danificada). "Hora extra" é botão de UI; nenhuma `Decision`, nenhum `registerConseq18`, nenhum ouvinte de `onFact` além de `disaster`. O `unl` de decide18 (desbloqueios) não abre prédios.
- Plano: Frente 1 só traz "campus × moral × qualidade × atração de talento".
- Fix:
  - (1) Obra atrasada vira carta: hora extra / trocar empreiteira / aceitar. Os ecos são acidente de obra, vizinhos reclamando, estúdio com som melhor.
  - (2) Investimento (estúdio, escola) dá `unlock` e eco em `quality18`/`discover18`.
  - (3) `disaster` gera carta de seguro (liga ao M17).
- Frentes 1 e 7. Liga: `campus18`, `decide18`, `quality18`, `school18`, `session18`. Esforço: M.

**B6. CA/PA × ofertas de artist18: pela metade.**
- Evidência: `interest18` lê CA/PA da banda (L135). Mas o contrato de desenvolvimento (`dev`) é decidido por `lb.strategy === 'develop' && a.fame < 22` (L618), não por PA. O `value18` dos termos (adiantamento, royalty) não escala com PA nem com a incerteza `est18` do selo (A&R bom enxerga o PA real). `discover18` (você descobre talento) e `artist18` (selo NPC descobre você) não competem pelo mesmo jovem.
- Fix:
  - (1) Dev deal e adiantamento pagam PA × olho do A&R do selo (com `explain18`: "o selo apostou no seu potencial 140").
  - (2) Talento que você ainda não assinou e tem PA alto recebe oferta de NPC no `discover18`: "assine antes" (prazo de 4 semanas na Caixa).
  - (3) Tutoria/`mentor18` do selo NPC entra como cláusula.
- Frente 1 (qualidade × CA/PA). Liga: `ability18`, `discover18`, `artist18`, `rivalmind18`. Esforço: M.

**B7. agency18 × artist18/cine18: NPCs agem, a cena não mostra.**
- 439 mensagens de `agency18` em 40 anos (2º tipo mais frequente) e 0 cenas. Um aliciamento, um processo ou uma traição contra você nunca vira cena. O `moment18` do `verbs18` já guarda `why`.
- Fix: os 3 verbos mais graves (`sue`, `poach`, `expose`) abrem cena menor (reunião de sala, tribunal) reaproveitando `PLACE18`. Ou então um "resumo da semana" (ver A3).
- Frentes 1 e 8. Esforço: S-M.

**B8. post18 (hologramas) × cine18: sem cena de estreia.**
- Evidência: `post18` emite `hologram` (0 ouvintes) e `dispute` de herdeiros sem cena. Pelo plano, "holograma liga a espólio, direitos, ética". Falta o momento: a estreia do show de holograma e a briga dos herdeiros.
- Fix: `hologram`/`dispute` ganham `Kind18` e `PLACE18` (`venue_theatre`/`court`). Storyboard "vale da estranheza" lendo a qualidade técnica do ano.
- Frente 4. Esforço: S.

---
## C. Jogabilidade, ritmo e tutorial

**C1. Resumo de fim de mês ("Pulso") sem causa.**
- `pulseNow18` mostra cash/fãs/humor/paradas, mas não diz qual decisão ou eco causou a mudança. O recibo (P3) está no plano; falta o elo "pulso → eco/decisão" (clicar em ▲ abre a cadeia de `cause` de `facts17`).
- Frente 8. Liga: `facts17.cause`, `explain18`. Esforço: S.

**C2. Tutorial e metas por era.**
- `help18tabs` tem a aba "Era acústica" e há trilha de objetivos por carreira. Não vi trilha de objetivos própria de 1889 (primeira gravação, primeira prensa em goma-laca, sobreviver ao pânico, licenciar o piano roll), nem aviso de "o jogo mudou de era" na transição 1925 (microfone), 1948 (LP) e 1955 (rock).
- Plano: Frente 8 só tem "transição de década".
- Fix: card "Nova era" (1 tela, 3 regras que mudam, 1 meta) e metas de abertura por época. Liga com `scenarios17`.
- Esforço: S-M.

**C3. Ritmo.**
- Em 1889 a Mesa abre ~7 decisões por ano, mas o `Pulso` e a Caixa produzem ~5,5 mensagens/mês. Quase todas informativas, poucas pedem resposta. Sugestão: meta de "1 decisão que importa por trimestre" no Mestre. Se o trimestre passou sem nenhuma, `dm18` eleva a tensão e escolhe um fio de campanha.
- Frente 8 + `dm18`. Esforço: S.

---
## D. Faltas que o plano19 não cobre (grep em plano/ideias vazio ou só menção)

**D1. Acessibilidade e conforto.**
- Evidência: grep por `reduced-motion`, `colorblind`, fonte e escala no código só toca CSS pontuais. Sem opção de movimento reduzido, modo daltônico (paradas e humor dependem de cor), tamanho de fonte, atalhos configuráveis. O plano tem 0 menções.
- Fix: painel "Conforto": movimento, paleta (ícone + cor), fonte, ritmo das cenas e dos avisos. Esforço: M.

**D2. Dificuldade assistida e modo história.**
- Plano: 0 menções a "dificuldade". Faltam: "Assistido" (previsões de lançamento visíveis, falência suavizada), "Mestre" (menos avisos, mais lacunas), e um **modo história** em que o Mestre conduz um arco por era.
- Liga: `dm18`, `advisor`, `policy18`. Esforço: M.

**D3. Fim de partida e meta-progressão.**
- Plano tem "por que perdi?". Faltam:
  - (1) Epitáfio da partida: resumo de legado com os 5 fatos mais fortes, cenas do álbum e cadeia de ecos.
  - (2) Herança entre partidas: um herdeiro do selo, a coleção de relíquias ou um "ano zero com um ato antigo".
  - (3) Sementes de desafio e conquistas por cadeia de história. O código de compartilhamento já existe (`newgame17`), mas sem placar de conquistas (grep `achievement` vazio na UI).
- Liga: `saga18`, `relics18`, `cine18` (álbum), `saves17`. Esforço: M-L.

**D4. Retrospectiva por década com o álbum.**
- Hoje o álbum de cine18 e o diário do `dm18` são telas separadas. Falta uma retrospectiva automática no fim de cada década (quadros + ecos + paradas + "o que aconteceu no mundo"). Plano: "transição de década" só em UX. Combina com B1 e A2.
- Esforço: M.

**D5. Verificação de integridade entre sistemas (testes).**
- Faltam testes de contrato entre sistemas da R18: "morte de ato com contrato 18 aberto", "campus destruído com obra pendente", "eco cuja pessoa saiu do mundo" (hoje `fire18` retorna `null` e o eco some em silêncio). Plano: 0.2 só valida ouvintes de fato.
- Fix: suíte `integration18.test.ts` com 10–15 cenários forçados via `emitFact`. Esforço: M.

---
## Top 15 (prioridade = impacto × ligação ÷ esforço)
1. **A2** Fatos: `chart` em marcos + anel por severidade/`kind` + ouvintes para `relic`, `hologram`, `echo`, `situation` (S-M). Destrava 0.2 e a malha inteira.
2. **A1** Piso de cobertura de ecos + ecos nos 40 eventos mais sorteados + eco padrão por tom (M+M). É o coração do "decide18".
3. **A3** Orçamento de notificações com números: Boletim semanal e teto de `a18_offer` (M). Conserta o ruído (65 msg/ano; 19 ofertas/ano).
4. **B3** era1889 × decide18/home18/Conselheiro: dicas, card "A era" e ecos de goma-laca/patente (M).
5. **B4** Contratos de artist18 por era (cachê por sessão antes de ~1903, sem "master") (S-M).
6. **B1** Eco forte → cena menor ("você escolheu X") + eco do tapete vermelho (M).
7. **B2** Espólio × contratos/sociedades de artist18 (rescisão por morte, reversão para herdeiros) (M).
8. **A6** `headless`/lotes passam a usar `playbot` (S). Sem isso o equilíbrio da R19 é medido em cima de um bot que quebra em 100% das partidas.
9. **A4** Teste de cobertura de caixa/fatos por era×role (S). 25 de 74 tipos nunca apareceram.
10. **B5** Campus com cartas de obra e ecos (M).
11. **B6** CA/PA como motor das ofertas e do aliciamento NPC × `discover18` (M).
12. **A5** Mesa com 11 seções: pesos, `when`, recolhimento (S-M).
13. **C2** Card "Nova era" + metas de abertura por época (S-M). Barato e de alto efeito no primeiro contato.
14. **D3** Epitáfio + herança + conquistas por cadeia (M-L). Dá motivo para jogar de novo.
15. **A7+C1** Cartas recusadas viram mensagem; Pulso aponta a causa do ▲▼ (S).

Menções: D1 acessibilidade (M), D2 dificuldade assistida/modo história (M), D4 retrospectiva por década (M), D5 suíte de integração R18 (M), B7/B8 cenas de agency18 e hologramas (S).

Observação: `git status` do repo mostra arquivos modificados que não são meus (era1889.ts, vários testes, `tests/zz-t1889.test.ts`); outro agente está editando em paralelo. Meus scripts temporários em `tools/` foram removidos e nada foi commitado.
