---
name: teoria-de-tudo
description: Análise completa de um jogo pela "Teoria de Tudo dos Jogos", um modelo unificado que junta MDA, Teoria da Diversão (Koster), Fluxo, motivação (SDT), decisões interessantes (Sid Meier), teoria dos jogos, pensamento sistêmico (Meadows), probabilidade, narrativa emergente, UX/acessibilidade, estrutura de sessão, saúde técnica e ética. Use quando o usuário pedir para "analisar meu jogo", "auditar o design", "revisão completa", "o que está fraco no jogo", "teoria de tudo", ou quiser um diagnóstico de game design baseado em evidências (código, simulações, docs). Aceita escopo opcional: "completa" (padrão), "rápida", ou nomes de camadas (ex.: "sistemas, teoria-dos-jogos").
---

# Teoria de Tudo dos Jogos — análise completa

Um jogo é **um sistema de regras** que roda **dentro da mente de um jogador** num **contexto** (mundo, mercado, tempo de vida).
Cada teoria clássica de game design enxerga uma fatia disso. Esta skill junta as fatias numa única
**cadeia causal**, e toda constatação precisa ser rastreada ao longo dela:

```
Código/dados → Mecânica → Dinâmica (o que emerge ao jogar) → Experiência (o que se sente) → Jogador (motivação, retorno)
                                     ↑                                        ↓
                              Contexto (era, mercado, plataforma, ética, tempo do jogador)
```

Um achado só está completo quando diz **onde nasce** (arquivo:linha, dado, regra), **o que causa no jogo**
(dinâmica observada ou medida) e **o que isso faz com o jogador** (experiência), mais **o que mudar**.

As 16 camadas estão em [references/camadas.md](references/camadas.md). O modelo do relatório está em
[references/relatorio.md](references/relatorio.md). Se o jogo for o **Masters / Vinyl-Game** deste repositório,
leia também [references/vinyl-game.md](references/vinyl-game.md) para as ferramentas de medição que ele já tem.

## Escopo (argumento)

- vazio ou `completa`: todas as 16 camadas, com coleta de evidência por simulação quando o jogo permitir.
- `rápida`: só leitura (docs + código), camadas 1–8 e 11, sem rodar lotes longos. Diga no relatório que é rápida.
- lista de camadas (`sistemas`, `teoria-dos-jogos`, `ux`…): só essas, mas a síntese ainda cruza com a camada 1 (pilares).
- um caminho ou sistema (`src/sim/contracts.ts`, "economia"): foque nele e passe por todas as camadas que o tocam.

## Regras de evidência (inegociáveis)

1. **Nada de número inventado.** Toda métrica vem de código lido, teste rodado, simulação rodada ou doc do projeto, com a fonte.
2. Marque cada afirmação como **Observado** (lido/medido), **Inferido** (dedução direta do código) ou **Hipótese** (precisa de teste com jogador ou de simulação que não rodou). Hipótese nunca vira "problema crítico" sozinha.
3. Cite `arquivo:linha` para código, o comando exato para simulação, e o tamanho da amostra (seeds, anos, partidas). "Nunca aconteceu" = "não apareceu nesta amostra".
4. Não mude o código do jogo durante a análise. Scripts de sondagem vão para o scratchpad (ou um diretório temporário) e são apagados; diga no relatório o que foi rodado.
5. Compare com a **intenção declarada** (GDD, README, docs de design) antes de julgar. Um "problema" que é escolha de design consciente vira "tensão", não "bug".

## Procedimento

### Fase 0 — Reconhecimento (sempre)
- Leia README, GDD/docs de design, `package.json`/build, a estrutura de pastas e os testes. Descubra: gênero, plataforma, público, loop principal, pilares declarados, como rodar, como testar, se há modo headless/bot/seed.
- Monte o **mapa do jogo**: lista de sistemas (nome → arquivos principais → o que entra e sai de cada um). Isso vira o apêndice A do relatório.
- Escreva em 3 linhas a **fantasia do jogador** e o **loop principal** (ação → retorno → nova decisão). Se não conseguir, isso já é um achado da camada 1.

### Fase 1 — Coleta de evidência
- **Leitura**: para cada sistema do mapa, leia as fórmulas, constantes, condições de vitória/derrota, eventos e IA.
- **Medição** (modo completo): se o jogo tem simulador sem interface, bot, seeds ou ferramenta de balanceamento, use-os. Prefira lotes com várias seeds e mais de um perfil de jogador. Registre comando, seeds, duração e tempo de execução.
- **Testes**: rode a suíte (ou a parte rápida). Falha de teste é evidência da camada 14.
- **Interface** (se der): rode o jogo e capture telas dos fluxos principais (início, primeira hora, tela mais densa, fim de partida). Sem browser disponível, analise o código de UI e diga que não houve inspeção visual.
- Para um jogo grande, distribua a leitura: lance agentes `Explore` em paralelo, um por grupo de camadas (ex.: 2–6 / 7–10 / 11–13 / 14–16), cada um devolvendo achados já no formato do relatório com `arquivo:linha`. Você faz a síntese; não repita a busca que delegou.

### Fase 2 — Análise por camada
Para cada camada em [references/camadas.md](references/camadas.md):
1. Responda às perguntas-guia com evidência.
2. Aplique os testes da camada (eles dizem o que medir ou procurar).
3. Dê a **nota 0–5** com a rubrica da própria camada e uma frase de justificativa.
4. Registre os achados (máx. ~6 por camada; agrupe os parecidos).

### Fase 3 — Síntese (é aqui que a "teoria de tudo" aparece)
1. **Cadeias causais**: junte achados de camadas diferentes que são o mesmo problema visto de ângulos distintos (ex.: estratégia dominante na camada 7 → decisões sem trade-off na 6 → tédio na 3 → abandono na 13). Uma cadeia vale mais que cinco achados soltos.
2. **Tensões**: pares de valores que o jogo precisa equilibrar (realismo × legibilidade, profundidade × carga cognitiva, aleatoriedade × agência, liberdade × direção). Diga em que ponto o jogo está e se é o ponto que os pilares pedem.
3. **Pontos de alavancagem** (Meadows): ordene as mudanças pelo nível em que atuam — parâmetro < estoque/fluxo < atraso < laço de realimentação < informação < regra < objetivo < paradigma. Mudanças em níveis altos resolvem várias cadeias de uma vez.
4. **Prioridade** = impacto na experiência × alcance (quantos jogadores/partidas) × confiança ÷ esforço. Use S/M/L para esforço.

### Fase 4 — Relatório
- Escreva seguindo [references/relatorio.md](references/relatorio.md).
- Destino padrão: `docs/analise-teoria-de-tudo-AAAA-MM-DD.md` no repositório do jogo (use a data de hoje). Se o usuário pedir outro lugar ou formato, siga o pedido.
- Na resposta ao usuário: o veredito em 2–3 frases, as 3 cadeias causais mais importantes, as 5 primeiras ações e o caminho do arquivo. Não cole o relatório inteiro.
- Não faça commit nem push do relatório a menos que o usuário peça ou o fluxo da sessão exija.

## Atalhos de julgamento

- O jogador otimiza a diversão para fora do jogo: se existe um caminho mais eficiente e chato, ele será o caminho (camadas 6–7).
- Toda informação que o jogador precisa para decidir e não vê é um defeito de informação, não de dificuldade (camadas 6, 11).
- Aleatoriedade antes da decisão cria planejamento; depois da decisão cria emoção e frustração. Veja qual é qual (camada 9).
- Um sistema sem laço de equilíbrio explode (bola de neve); sem laço de reforço, estagna. Procure os dois em toda economia (camada 8).
- Se uma regra precisa de um parágrafo de ajuda para ser entendida, conte isso como custo (camada 11).
- Se cortar um sistema inteiro não muda nenhuma decisão do jogador, ele é decoração (camadas 2, 6).
