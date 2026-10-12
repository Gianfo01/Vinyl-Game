# Modelo do relatório

Escreva em português (ou no idioma que o usuário usar), frases curtas, sem enrolação. Use o formato abaixo.
Os blocos de achado seguem o estilo de revisão já usado no projeto: **Evidência → Efeito → Fix → Esforço**.

```markdown
# Análise "Teoria de Tudo" — <nome do jogo> (<data>)

Escopo: completa | rápida | camadas X, Y
Método: o que foi lido, o que foi rodado (comandos, seeds, anos, perfis, tempo), o que NÃO foi possível (ex.: sem inspeção visual).
Limites: tamanho das amostras; o que é hipótese.

## Veredito
2–4 frases: o que o jogo é hoje, o que mais o segura, o que mais o levantaria.

## Painel das 16 camadas
| # | Camada | Nota 0–5 | Uma frase |
|---|---|---|---|
| 1 | Identidade e pilares | 4 | ... |
| … | … | … | … |
Média por grupo: Sistema x,x · Mente x,x · Superfície x,x · Tempo e contexto x,x

## Cadeias causais (o centro do relatório)
### C1. <nome curto do problema de ponta a ponta>
- Origem (código/dado): `arquivo:linha` — ...
- Dinâmica: ... (Observado/Inferido/Hipótese; amostra)
- Experiência: ...
- Jogador: ...
- Camadas envolvidas: 7 → 6 → 3 → 13
- Ponto de alavancagem: <nível Meadows> — <mudança>
- Esforço: S | M | L · Prioridade: P0 | P1 | P2

## Tensões de design
| Tensão | Onde o jogo está | Onde os pilares pedem | Recomendação |
|---|---|---|---|

## Achados por camada
### <n>. <Camada> — nota x/5
**<n>.<k> Título curto do achado.**
- Evidência: ... (`arquivo:linha`, comando, números) [Observado|Inferido|Hipótese]
- Efeito: ...
- Fix: (1) ... (2) ...
- Liga com: C1, camada 8. Esforço: S/M/L.

(repetir para cada camada no escopo; camada sem achado relevante = uma linha dizendo por quê)

## Plano de ação
| Prioridade | Ação | Cadeias/achados que resolve | Nível de alavancagem | Esforço |
|---|---|---|---|---|
Ordene por impacto × alcance × confiança ÷ esforço. Primeiro as ações que resolvem várias cadeias.

## O que medir a seguir
Experimentos que transformariam hipóteses em evidência (simulação, teste com jogador, telemetria), com o critério de sucesso de cada um.

## Apêndice A — Mapa do jogo
| Sistema | Arquivos principais | Entradas | Saídas | Pilar |

## Apêndice B — Diagramas
Estoques e fluxos (mermaid), árvore MDA das estéticas principais.

## Apêndice C — Dados brutos
Tabelas das simulações usadas (resumidas), com comando de reprodução.
```

## Checklist antes de entregar
- [ ] Toda nota tem justificativa e toda justificativa tem evidência.
- [ ] Nenhum número sem fonte; amostras declaradas.
- [ ] Hipóteses marcadas e fora do P0.
- [ ] Pelo menos 3 cadeias causais cruzando camadas (no modo completo).
- [ ] O plano de ação cita os achados que resolve.
- [ ] Scripts de sondagem apagados; repositório do jogo sem mudanças além do relatório.
