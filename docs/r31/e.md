# E · Bolsa — valor real por empresa (onda 3)

Medição: `npx tsx scripts/r31/measure.ts --jobs 2 --out docs/r31/e` (interruptor `bolsa31.value` ligado, padrão) e
`R31_SW=bolsa31.value=false … --out docs/r31/e-off` (desligado). 4 sementes × 5 eras × 36 meses, robô realista.
O `R31_SW` (novo no measure.ts) aplica o interruptor logo depois de criar a partida: os selos que já nascem listados
(IPO histórico no 1º dia) são semeados com o valor novo nas duas medições; o resto do mundo segue o interruptor.
`base30.json` é da versão 30 (antes das ondas 0–2) e não serve de comparação para esta mudança isolada.

## Números (mediana das 4 sementes; ligado / desligado; dólares de 2020)

| Era | Patrimônio | Caixa | Receita do último ano | Atos | CPU ms/mês |
|---|---|---|---|---|---|
| 1900 | 3.504 mil / 3.504 mil | 62 mil / 62 mil | 1.171 mil / 1.171 mil | 3 / 3 | 257 / 280 |
| 1955 | 308 mil / 308 mil | 5 mil / −1 mil | 274 mil / 274 mil | 3 / 3 | 545 / 575 |
| 1990 | 1.633 mil / 1.613 mil | 25 mil / 39 mil | 647 mil / 667 mil | 3 / 3 | 1.182 / 1.219 |
| 2012 | 5.632 mil / 6.138 mil | 42 mil / 40 mil | 1.832 mil / 1.687 mil | 4 / 4 | 1.813 / 1.845 |
| 2030 | 4.131 mil / 4.190 mil | 181 mil / 175 mil | 1.809 mil / 1.734 mil | 4 / 4 | 2.092 / 2.100 |

9 das 20 partidas mudam (nenhuma antes de 1930: ainda não há selo listado). As diferenças não têm sentido único
(1990 semente 2: 1,43 mi contra 1,02 mi; 2030 semente 2: 14,7 mi contra 16,6 mi): é o efeito borboleta das
cotações dos rivais, que mudam quanto custam as participações e as compras de blocos dos NPCs (e com isso quem
controla quem). O robô não abre capital nem compra participações nestes 36 meses, então o jogador não sente a
mudança direta no balanço. Custo: nenhum (o modelo roda só para selos listados e no IPO/participação; o índice
de lançamentos por dono é refeito uma vez por semana).

## O que mudou para o jogador

- A ação do seu selo segue o valor da empresa e não escorrega mais todo janeiro (antes: lucro e crescimento do
  ano-calendário quase zerados em janeiro puxavam −2% a −4% no mês). Agora receita e lucro são os 12 meses
  fechados da DRE.
- Selos rivais: preço pelo mesmo valor, sem os solavancos por notícia somados ao valor (antes o hit entrava pelo
  valor e de novo pelo solavanco).
- Ficha "Por que vale isso" em Você › Bens e investimentos › Investimentos › Bolsa (seu selo, mesmo antes do IPO,
  e cada selo listado; rival sem 5% das ações mostra o balanço numa linha): parte, valor, fato/cálculo/hipótese e
  o porquê. Notícias do pregão com o motivo de cada alta/queda grande.
- Passam a mexer no valor: processos (perda esperada), crime (prisões, ligação com o crime, calor da polícia),
  relíquias (valor de venda; exposição como marca), festivais (incidentes e shows), prêmios, saída e roubo de
  gente, antitruste, boicote e cancelamento.
- O mesmo valor dá o preço do IPO, a avaliação do selo para sócios e o preço de participações em rivais;
  `dealValue31` fica pronto para a SOC.

Capturas: `docs/r31/shots/onda3-e-seu-selo.png`, `onda3-e-rival.png`, `onda3-e-pregao.png`.
