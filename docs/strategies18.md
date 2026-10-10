# Rodada 18 — campanhas longas por estratégia (long18, feedback #15)

Script de rascunho (não versionado): playbot16 com perfil-base + ajustes de botões + doutrinas e decisões do selo
(paths18) + políticas (policy18), **12 anos**, sementes S1 (1965), S2 (1985), S3 (2003). Caixa em US$ de hoje.
"Baixa" = menor caixa real durante a campanha. Caminhos = 3 maiores pontuações de `allScores18` no fim.

| Estratégia | Como o bot joga | Caixa final (S1/S2/S3) | Pior baixa | Falências | Vantagem | Limite |
|---|---|---|---|---|---|---|
| Pequena e ética | cauteloso, 3 artistas, Contrato justo + Código de ética + Reserva sagrada, reserva 3 meses, descanso 65 | 1,68M / 1,79M / 7,0M (re-rodada S1: 0,60M) | +2k | 0/3 | nunca fica no vermelho; confiança 67–94; indie 91–100; reputação institucional alta | pouco volume: quase nenhum nº 1, fatia de mercado pequena, caminho "major" estaciona em ~60 |
| Expansão agressiva | agressivo, 10 artistas, 3 empréstimos, Crescer + Fábrica de hits | 0,19M / 0,17M / 1,68M | −186k | 0/3 | mais lançamentos (119–183) e elenco; "major" 57–70 | buraco de caixa fundo nos anos 2–5; reputação institucional cai a ~0; confiança 59–70 |
| Foco em catálogo | cauteloso, marketing baixo, Guardião do catálogo + Arte primeiro, box de aniversário | 0,59M / 0,66M (1,31M) / 8,4M | −13k | 0/3 | único que pontua o caminho "catálogo" (63); renda recorrente; nº 1 tardios | cresce devagar nos primeiros 5 anos |
| Produção frequente | lançamento a cada ~8 semanas com caixa equilibrado, Fábrica de hits + Lançamento contínuo | 0,18M (0,34M) / 0,45M / 2,18M | −206k | 0/3 | o maior volume (130–190 lançamentos) e alcance | saturação + custo de projeto: baixas profundas; reputação artística cai (7–58) |
| Turnês | equilibrado com turnê a cada 12 semanas e 30% do caixa na estrada | 0,22M / 0,44M / 1,62M | −56k | 0/3 | caixa mais estável que o agressivo; fãs fiéis | a estrada cansa (com a política de descanso o ritmo cai); pouco catálogo |
| Contratos duros | equilibrado, Contrato de ferro + Vale-tudo, apertar o recuperável | 0,43M / 0,31M / 0,99M | −81k | 0/3 | margem: mais nº 1 em S3 (5); "major" 63–67 | confiança do elenco 40–71, reputação institucional ~0, risco de escândalo |
| Equilibrado (referência) | playbot padrão | 0,46M (0,22M) / 0,50M / 0,33M | −78k | 0/3 | — | — |

## Leitura
- **Todas sobrevivem 12 anos** (0 falências em 21 campanhas + 8 re-rodadas). Nenhuma estratégia domina em tudo: a
  pequena/ética e a de catálogo vencem em caixa e segurança; agressiva, frequente e contratos duros vencem em volume,
  elenco e paradas, pagando com baixas profundas, confiança e reputação. Isso é o que o feedback pediu.
- As diferenças de caixa entre sementes são enormes (a simulação é caótica: um nº 1 muda a década), então a comparação
  vale pela **forma** (baixas, confiança, reputação, caminhos), não pelo número exato.
- O caminho "selo cult de prestígio" saturava em 75 para todos (reputação artística sempre chega a 100): trocado por
  "discos aclamados (crítica 80+)" e média da crítica 82. Ainda fica perto de 75 em vários perfis — a nota da crítica do
  jogo é generosa (pendência para quality18/art18).
- O caminho "indie sustentável" era fácil demais (85+ para quase todos): agora pede 5 anos de lucro operacional, 24 meses
  de fôlego e confiança 80.

## Ajustes feitos (dentro do long18)
- Doutrina "Crescer a qualquer custo": apelo +5%, paradas +2%, salários +4% (antes +3% / — / +6%): a expansão ficava
  sem retorno e com baixas de −150k a −200k; as baixas do agressivo S1 melhoraram (−51k → −38k).
- Doutrina "Lançamento contínuo": paradas +4% e apelo +2% (antes só +3% nas paradas) para compensar a saturação.
- KPIs de indie e de prestígio endurecidos (acima).
- Regressão do playbot equilibrado (12 sementes, 5 anos) com long18 ligado: falências 1/12 → 1/12; mediana do caixa
  real 180k → 230k (a diferença vem da divergência caótica — long18 não mexe em dinheiro do bot: políticas, doutrinas e
  dificuldade adaptativa ficam desligadas por padrão; só os Fatos novos alteram a sequência do sorteio de outros sistemas).
