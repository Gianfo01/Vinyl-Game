# Medição CAR (carreiras que mudam o mundo)

6 meses, sementes car-m1, car-m2, car-m3; gêmeas com o efeito no mundo ligado × desligado (mesma decisão).

| Caso | Unidades na parada do país (on ÷ off) | Semanas-faixa no top 40 do país (on / off) | Vendas das faixas (on ÷ off) | Fama local (on − off) | Próprio |
|---|---|---|---|---|---|
| Rádio 1960 | ×1.183 | 152 / 141.667 | ×1.012 | +46.067 | audiencia 37.7, ibope 1, rivais 3 |
| Rádio 1978 | ×1.09 | 202.333 / 197 | ×1.006 | +51.667 | audiencia 34.8, ibope 1, rivais 9 |
| Rádio 1995 | ×1.076 | 199.667 / 194 | ×1.005 | +36.967 | audiencia 30.1, ibope 1, rivais 9 |
| TV 1985 | ×1.235 | 102.333 / 90 | ×1.011 | +61.9 | audiencia 39.5 |
| Plataforma 2016 | ×1.692 | 165 / 135.333 | ×1.047 | +172.2 | assinantes_mi 5.5 |
| Casa de shows 1975 | ×1.01 | 24.333 / 23 | ×1.001 | +20.233 | prestigio 24.2, noites_lendarias 1 |

Com a segunda rodada ligada, a rádio só disputa com as estações da própria cidade (`car31.cities`): a audiência sobe (18–27% → 30–38%) e o efeito nas paradas do país cresce um pouco (Rádio 1960 ×1,14 → ×1,18). A TV usa o clipe do jogo (`car31.clips`): faixas de outros selos ficam iguais, por isso a TV 1985 quase não muda.

## Segunda rodada: gêmeas por item (`car-medida2.md`)
Sementes car-m1, car-m2, car-m3; em cada linha só o interruptor do item muda (média das sementes).

| Item | Medida | Ligado | Desligado |
|---|---|---|---|
| 1. Estúdio → moda do gênero | discos assinatura | 60 | 0 |
|  | moda empurrada | 0.62 | 0 |
|  | estilos | 66.33 | 66.33 |
|  | moda media estilos | 0.84 | 0.83 |
|  | moda soma sucessos delta | 1.73 | 1.61 |
| 2. Clipes da TV = media18 | audiencia tv | 25.31 | 25.41 |
|  | unidades clipes | 228923.33 | 217516 |
|  | semanas rotacao pesada | 5 | 0 |
| 3. Agência no motor de rotas | shows no alvo | 2.67 | 0 |
|  | publico medio pct | 37.02 | 0 |
|  | fama alvo | 6.77 | 7.97 |
|  | caixa delta | -3842.67 | -4463.33 |
| 4. Empresário: mais pedidos | pedidos | 18 | 6 |
|  | aceitos | 12 | 4.33 |
|  | recusados | 6 | 1.67 |
|  | unidades disco | 75438 | 73117.67 |
|  | parada pais | 8865.67 | 7911.33 |
|  | fama local | 23.5 | 16.13 |
| 5. Crítica por país do veículo | paises | 3 | 1 |
|  | unidades fora | 192923 | 0 |
|  | unidades total | 1421699.67 | 1395498.67 |
| 6. Olheiros rivais | revelacoes | 3 | 3 |
|  | levadas por rivais | 3 | 0.67 |
|  | contagem casa | 2.67 | 0 |
| 7. Exclusividade com raio e prazo | clausulas | 3 | 0 |
|  | festivais bloqueados | 0.67 | 0.67 |
|  | bonus procura pct | 36.28 | 18 |
|  | procura | 5827.33 | 5045.67 |
|  | custo clausulas | 7878370.67 | -9817.67 |
|  | quebras | 0.33 | 0 |
| 8. Rádios NPC com cidade | audiencia | 36.47 | 21.97 |
|  | rivais na cidade | 1 | 1 |
|  | alcance rival medio | 0.88 | 1.06 |
|  | ibope | 1 | 1 |
|  | de | 9 | 25 |
| 9. Boicote à plataforma | assinantes mi | 3.35 | 4.07 |
|  | artistas fora | 3.33 | 0 |
|  | faixas no top | 20 | 20 |

Leitura:
- **Estúdio → moda:** cada estilo empurrado fica nos tetos (+0,04/mês, +0,25/ano); o efeito médio sobre todos os estilos é pequeno (+0,01) porque a assinatura se espalha por muitos estilos; os sucessos do topo ganham mais (+0,12 de moda somada).
- **Clipes:** a rotação pesada da TV vira 5 semanas de rotação pesada do clipe (×1,3 do media18); os discos com clipe vendem +5%, e o disco seu sem clipe derruba um pouco a audiência.
- **Agência:** a turnê vira 2–3 datas reais com público incerto (37% da casa em média, mercado novo); a fama no país sai um pouco MENOR que na regra instantânea antiga (que dava fama sem show) — é o preço de abrir mercado de verdade.
- **Empresário:** o triplo de pedidos dá +12% de vendas no país e +7 de fama local; um terço é recusado com motivo.
- **Crítica:** com alcance 60 a resenha sai em 2 países a mais; as vendas fora são 14% do total das faixas resenhadas.
- **Olheiros:** sem resposta sua, as três revelações são levadas (desligado, 0,7 delas seriam assinadas de todo jeito pelo mercado comum).
- **Exclusividade:** a cláusula máxima dobra o bônus de procura (18% → 36%) a um custo alto; quase não há festivais rivais NPC por perto (0–1), então o valor vem do raio e do prazo; uma quebra em três partidas.
- **Rádios por cidade:** a disputa fica com 1 rival do formato na cidade (de 25 para 9 estações no ibope); a rival perde alcance (1,06 → 0,88).
- **Boicote:** com confiança dos artistas em 5–20 e sem respostas, 3–4 artistas saem em 8 meses e levam 18% dos assinantes.
