# Plano da versão 28 — a partir da "Análise Teoria de Tudo" (2026-10-12)

Fonte: `docs/analise-teoria-de-tudo-2026-10-12.md` (branch `claude/dazzling-ptolemy-yjiyf0`). A análise foi feita sobre uma base
anterior à rodada 27; cada item abaixo foi cruzado com o que a R27 já mudou. Coluna "R27": ✅ já resolvido, 🟡 em parte, — não tocado.
Antes de começar, a fase 0 re-mede tudo na base da R27 (alguns números da análise já mudaram).

## Fase 0 — Medir de novo na base da R27 (S)
| Item | Por quê |
|---|---|
| `balance --full` (4 perfis + adversários, 6 seeds × 5 anos) e `--quick --det` | A análise mediu 50 % de quebra no equilibrado; a R27 mudou festivais, dados, mundo, renegociação e o bot |
| Suíte em série (`--no-file-parallelism`) e lista real de falhas | Separar carga de falha de verdade (r16-playbot, r14-db) |
| CPU por mês e tamanho do save por década (1962→2040 headless) | Base para a frente técnica |
| Recontar: ecos "provável" errados, calibração da previsão, eventos sem dica | Linha de base para os testes-meta |

### Resultado da fase 0 (`docs/medicao28.md`, base `b748d64`)
| Medida | Análise | R27 | Meta |
|---|---|---|---|
| Quebra do equilibrado (`--full`) | 50 % | 33 % (1975 `b19-2`, 1889 `b19-4`) | 10–30 % |
| Quebra do cauteloso | 0 % | 17 % (1889) | — |
| Agressivo ≥ cauteloso em patrimônio | — | 3 de 6 (um por quebra do cauteloso) | ≥ 1/3 |
| `flip` (vender o selo), líquido × equilibrado | 2× | 16× | guarda-corpo |
| Híbrido (5 anos) × equilibrado | ~60× cachê | 24 mi × 5 mi | guarda-corpo |
| Faixa da previsão contém a procura | 62,5 % | 49 % (vendido: 33 %); falta de estoque em 90 % dos lançamentos | 78–82 % |
| "Depois" otimista | 262 | 390 (262 padrão + 58–136 escritos à mão) | 0 |
| Opções sem dica nem "Agora" (120 mais sorteados) | 57 % | 46 % | piso global |
| CPU/mês 1962→2008 (headless) | 1,2 s (1962) | 1,2 s → 19–23 s (pior mês 48 s); save 1,8 → 31 MB | ≤ 2× por década |

**Mudanças no plano por causa da medição**
- **Nova fase 7A (desempenho) já no passo 2**, em paralelo com 1A/1B/2: a curva de CPU torna runs longas injogáveis antes de 2000, e a escolha do ano de fim (decisão 1) depende disso. Escopo: perfilar os ganchos numa partida 1990+, poda/agregação de lançamentos e pessoas inativas (catálogo agregado), teste de custo por década (`measure28 long` encurtado). A sessão `claude/r27-perf` já atacou o `r14-db` na R27.
- **1B:** "Depois" com `echoP18` e o `ctx` real da decisão, cobrindo também os ecos escritos à mão e testando vários estados; tiragem lê o marketing **antes** de calibrar; a calibração final da previsão (80 %) é refeita **depois** da 1C, sobre a "procura" (vendido + falta).
- **1C:** medir com `--grid` (amostra fixa: as 6 seeds `b19-0..5` × os 4 inícios 1889/1955/1975/2005 = 24 partidas por perfil, ~1 h de CPU para os 4 perfis; `flip` e híbrido com amostra menor) e investigar 1889/1975 antes de mexer em choques; `flip` e `--role hybrid` entram como guarda-corpos do teste-meta; o cauteloso não pode quebrar mais do que hoje.
- `r16-playbot` (`hires` = 0) foi resolvido na R27 (AUD1: primeira contratação no 1º ano quando o selo já fatura).

### Plataforma alvo: jogo instalável (decisão do autor, 2026-10-13)
Quando os ajustes acabarem, o jogo deixa de ser um HTML e vira um app instalado no computador. A fase 7A já trabalha pensando nisso:
- **Casca:** Electron (Chromium + V8 iguais em toda máquina) ou Tauri (instalador menor, mas usa o navegador do sistema). A decisão fica para o empacotamento; o código do jogo não muda.
- **O que o app instalado ganha de verdade:** sem limite de cota do navegador para saves; save em arquivo no disco (gzip/zstd, salvamento em segundo plano); sem a aba ser "congelada" quando fica em segundo plano; dá para reservar mais memória e usar vários núcleos (simulação num Worker, separada da tela).
- **O que não muda sozinho:** a simulação continua rodando numa linha de execução só, com o mesmo motor JavaScript; uma máquina boa ajuda (~1,5–3× mais rápida que a da medição), mas não segura uma curva que cresce 15–19× até 2008. Por isso a poda/agregação do histórico e o corte dos ganchos caros continuam obrigatórios.
- **Na 7A:** (1) simulação num Web Worker (a tela não trava no avanço do mês); (2) camada de save com adaptador (IndexedDB hoje → arquivo no app), mantendo o gzip que já existe em `store.ts`; (3) metas: ≤ 2,5× de custo por década e save ≤ 15 MB em 2040.

## Fase 1 — As três promessas (P0)
### 1A. Run reproduzível (C4) — S
- `ensureExt` passa a atribuir objetivo, idade de aposentadoria, persona e líder **no nascimento** da pessoa; no carregamento só completa saves antigos.
- Acaso do lançamento semeado por (seed, id do lançamento), fora do fluxo compartilhado dos NPCs (`market.ts:136`).
- Desfazer não passa mais pela `migrate`.
- Teste "continuar = salvar + carregar + continuar" por 12 meses em 3 seeds → estado idêntico.
- R27: 🟡 (reações de NPC já semeadas pelo conteúdo do fato — `factSeedKey17`).

### 1B. Incerteza legível (C3) — S cada
- "Depois" das cartas usa `echoP18` (a chance real), com teste.
- Regra "chance mostrada = sorteada" (`odds19`) estendida a todo sorteio que o jogador influencia; faixa nas opções de evento que sorteiam (events.ts, events_more.ts).
- Placar da contratação com o mesmo ruído da faixa (não o verdadeiro) no "por quê".
- Previsão de vendas com gancho, hype, superexposição, teto de fatia e foco; calibrada para 80 % e rotulada "8 em 10".
- Tiragem sugerida lê o marketing; aviso de reprensagem e "vendas perdidas" no por quê.
- "Agora" automático por simulação a seco do `apply` em 100 % dos 120 eventos mais sorteados; piso global de dica/eco.
- R27: 🟡 (negociação jogável já mostra faixa do mínimo; shows mostram chance de cada opção).

### 1C. Risco que vale a pena (C2) — M
- Choques em `max(piso, x % da receita de 12 meses)` (aluguel, chantagem, payola…).
- Retorno convexo de verba: hype sobe a chance de hit, não só o volume.
- Passividade custa: rivais aliciam artista pouco promovido (`rivalmind18`).
- Torneiras regulares de reputação (pagar em dia, auditoria limpa) e tendência visível.
- Investigar a quebra do equilibrado em 1889/1975 e o choque do petróleo (`68b42ba`).
- Papel artista/híbrido: custo fixo próprio e cachês revistos (hoje pagam ~60× o selo).
- Teste-meta: agressivo ≥ cauteloso em patrimônio em ≥ 1/3 das (seed, início); quebra do equilibrado entre 10 e 30 %.
- R27: 🟡 (campanha de lançamento jogável e bot que usa todos os negócios estão em andamento).

## Fase 2 — Modo aleatório com reais sólido (C1) — S + M
- `allowed(s, tag, ctx)` único consultado por TODOS os geradores (crime17, crimenpc17, lifecycle7, vices, love17, heist27, eggs27, scenes27…); teste por filtro (6 filtros × 24 meses = zero fatos com a tag).
- Pilar escrito no README; corrigir `crime17.ts:7`, `README.md:217`, `realnames.ts:1`.
- Aviso de ficção na Revisão da Nova run; selo "Simulado" nas manchetes de crime, vício e caso com pessoa real (reaproveitar `provbadge20`).
- Ordem de resolução: decisão final da banda suprime a anterior (Carter Family); morto real antes do início = aposentado, salvo opção "lendas voltam".
- Gangues nunca por gênero musical (`crimenpc17.ts:32`) — por traços e cena local.
- Drogas não são o melhor alívio de estresse; ganho decrescente com a dependência. (R27: 🟡 a frente AUD2 já dá efeito colateral aos alívios.)
- Barreira racial: opção contexto/efeito; "enfrentar" compensado.
- Se for publicar: nomes reais como pacote que o jogador ativa (decisão do autor).

## Fase 3 — A história do jogador em primeiro plano (C5) — S–M
- Orçamento único de atenção (`notify19`) estendido a cenas, Diário e camadas de tutorial. R27: 🟡 (fila de uma janela por vez `queue27`, no máximo 2 cenas por avanço).
- Diário do jogador num anel próprio, sem descarte; "só marcantes" sem nº 1 alheio.
- Cooldown por (evento, ator) com peso × 0,85ⁿ; 3–4 variantes de eco por (categoria × tom); eco escalado pela receita anual.
- Eco forte vira cena "você escolheu X" (no máximo 1 a cada 2–3 meses).
- Portões de época nos eventos (`era?: [y0,y1]`/`needsTech`), teste de vocabulário moderno em 1889/1920; nome da parada por ano.
- Mundo inicial com gênero pela cena da cidade e nome pela língua do país. R27: 🟡 (cenas com ciclo de vida já existem).
- Eco perdido em silêncio (`decide18.ts:77, :90`) passa a ser registrado.

## Fase 4 — Primeiro sucesso perto e fim com peso (C6) — S + M
- Orquestrador de onboarding de 1 camada; tutorial que se conclui fazendo; cenário de entrada "Primeiro hit". R27: 🟡 (próximo passo `journey23`, Sede como entrada, Nova run rápida).
- Recomendado com prazo de 25 anos + "continuar em sandbox"; "Rumo a: <final> (x/100)" na Sede/Cockpit; capítulos por década com epitáfio parcial.
- Começo diferente por seed (situação inicial sorteada).
- Fim de partida com storyboard (álbum de cenas + 3 maiores cadeias de eco + epitáfio). R27: 🟡 (cenas animadas existem; falta o fim).
- Áudio: religar `src/audio/engine.ts` — prévia no "Ouvir" e stingers de 0,5–1 s por era nos marcos, opt-in; corrigir README §25.

## Fase 5 — Contratação com escolha (C7) — S–M
- Promessas com verba comprometida, prazo e multa.
- Rival também na oferta ao vivo de atos com fama > 10; reserva própria do rival (não ancorada no seu lance); contraproposta com sorteio.
- Rivais sem estado privado (receita real, `trust`): inferem por paradas e boatos, com ruído.
- R27: 🟡 (negociação jogável com rival e limites escondidos; renegociação passou a disparar).

## Fase 6 — Legibilidade e acessibilidade — S–M
- Bloco "Agora" único no topo; remover duplicatas ("Decisões (0)" 3×). R27: 🟡 (Sede com "Precisa de você").
- Alto contraste de verdade (paleta completa, teste ≥ 7:1). R27: 🟡 (AA nas telas, 413 → 55 textos abaixo).
- Alvos ≥ 24 px no Mundo pelo celular; mapa com camadas recolhidas; migalhas sem repetição. R27: 🟡.
- Ruídos: id da run que parece ano, "medium" sem tradução, "Talento atualoculto", flexão "pai/mãe", leitura da negociação só por hover.
- Agenda com prévia por vaga ("+2 voz, −5 fadiga") e linha de efeito somado no fechamento do mês; delegação de agenda ligada por padrão.
- Leitor de tela real e atalhos configuráveis (dívida crônica).

## Fase 7 — Saúde técnica e escopo (C8) — M–L
(7A = só a parte de CPU por mês/save, adiantada; o resto da fase 7 fica no passo 5.)
- `test:fast` × `test:sim` (série); testes de desempenho medem CPU; rodar a suíte em série antes de fechar a rodada.
- Ordem do tick explícita (`phase/order`) e teste que a congela; fachadas obrigatórias (teste que proíbe import fora da fachada).
- Migrações explícitas por versão de esquema + saves fixos em teste. R27: 🟡 (SAVE_VERSION 6; saves velhos excluíveis).
- CPU por mês: perfilar os ~430 `registerSimHook`, amostrar NPCs inativos, cauda agregada do catálogo do jogador, Web Worker.
- Fusões: fama15/16+notoriedade14; explain8/12+why18; manager11/12+managers14; charts2 em charts7. R27: 🟡 (festivais, casas de show e olheiros unificados pela AUD1).
- Pilares escritos (P1–P6) e "serve a qual pilar?" na regra de entrada; orçamento de sistemas.
- "Patrimônio do dono" numa aba (bolsa, bens, títulos).

## Fase 8 — Pendências crônicas da verificação
- Cenas de golpe de NPC e de holograma/briga de herdeiros (B7/B8). R27: 🟡 (cenas animadas; faltam esses dois).
- Modo assistido / história (D2).
- Facções de fãs × escândalo (I13).
- Uma decisão que importa por trimestre + delegação lida pelo Mestre (C3/I25).
- Cadeias de história 1, 2 e 5 em partidas reais; prêmios pelas dimensões de qualidade (I18); escândalo de fundador-instituição (N25); sociedade de banda com NPC; reputação de selo NPC nas ofertas.
- Dados: Johnny Ventura (2021) e Orlando Julius (2022) sem fim de carreira — conferir.

## Como medir (critérios de pronto)
| Experimento | Sucesso |
|---|---|
| `balance --full` depois da 1C | Agressivo ≥ cauteloso em ≥ 1/3; equilibrado quebra 10–30 % |
| Calibração da previsão (≥ 300 lançamentos) | Faixa contém a procura em 78–82 % |
| Salvar + carregar + continuar (12 meses, 3 seeds) | Estado idêntico |
| Filtros (6 × 24 meses) | Zero fatos com a tag filtrada |
| 1962 → 2040 headless | Nenhuma década com mais de 2× o custo da primeira |
| Cartas "sempre padrão" × equilibrado × pior (12 seeds) | Equilibrado > padrão > pior, sinal estável |
| Leitor de tela nos 5 fluxos principais | Oferta e lançamento só com teclado + leitor |

## Ordem sugerida e agentes
1. Fase 0 (1 agente, feita) → 2. Fases 1A + 1B + 2 + 7A em paralelo (4 agentes) → 3. Fase 1C (1 agente, com balance `--grid`) e recalibração da previsão (1B) →
4. Fases 3 + 4 + 5 (3 agentes) → 5. Fases 6 + 7 (2 agentes) → 6. Fase 8 (1–2 agentes) → suíte em série + build Masters_28.

## Decisões do autor (respondidas)
1. **Prazo:** o jogador escolhe o ano de início e o de fim na Nova run (com "continuar em sandbox" ao chegar no fim). Sem prazo fixo de 25 anos; o Recomendado sugere um fim, editável.
2. **Carreiras:** manter as 12 em pé de igualdade.
3. **Áudio:** opt-in (desligado por padrão, liga nas Opções).
4. **Nomes reais:** ficam como estão por enquanto (sem pacote ativável).
5. **Barreira racial histórica:** com efeito na mecânica; "enfrentar" precisa ter retorno que compense.
