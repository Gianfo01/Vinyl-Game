# Preços por era — revisão da Rodada 20c (N2)

## Moeda e base de tempo

- O motor guarda todos os preços em **dólares de 2020** ("reais") e mostra o valor **nominal** do ano da partida:
  `money(s, x) = x × índice(ano)` (`src/core/money.ts`, índice de preços ao consumidor dos EUA, 2020 = 1,00, com a
  mesma escala de 0,85× antes de 1920).
- Na interface, qualquer preço com "por quê" (`price20`, `src/sim/sys/price20.ts`) mostra: valor nominal, índice do
  ano, equivalente em US$ de 2020, o tipo da ação e (no recorrente) o total por ano. Dica curta: "Valores em US$ de
  {ano}; ≈ US$ X de 2020". Ajuda: aba `*` → "Preços, moeda e ano-base"; glossário `nominal20`.
- Sede (Estrutura → "Ações da sede e custos"), Nosso mundo (popup do prédio/lote) e a loja de equipamentos separam
  as ações: **alugar** (recorrente), **mudar de sede**, **comprar**, **reformar**, **equipar**, **construir**,
  **ampliar** (investimento). "Ampliar a sede" passou a se chamar "Mudar de sede" no botão da Sede porque troca o
  nível do imóvel e o aluguel (o custo mostra o aluguel novo).
- Não há multiplicador global: só itens com erro evidente foram recalibrados.

## Famílias revisadas (valor nominal; 1889 · 1925 · 1962 · 1985 · 2005 · 2020)

| Família | Exemplo | Valores | Situação |
|---|---|---|---|
| Prédio/aluguel | Sede "Estúdio pequeno", aluguel/mês | $27 · $56 · $115 · $383 · $702 · $900 | ok (aluguel de sala comercial modesta) |
| Prédio/compra | Mudar para "Loft" | $4,2 mil · $8,8 mil · $17,9 mil · $59,5 mil · $109 mil · $140 mil | ok |
| Equipamento | Gravador multipista | — · — · $1,5 mil · $5,1 mil · $9,4 mil · $12 mil | ok (bloqueado antes da tecnologia) |
| Equipamento | Fábrica própria | $10,4 mil · $21,9 mil · $44,8 mil · $149 mil · $273 mil · $350 mil | **recalibrado** (era $90 mil em 2020) |
| Instrumentos/estúdio (gear) | Console britânico de 1968 | 1968: $13,7 mil · 2020: $90 mil | **recalibrado** (era $22 mil) |
| Instrumentos/estúdio (gear) | Placa de reverb de aço (1957) | 1957: $2,3 mil · 2020: $20 mil | **recalibrado** (era $7 mil) |
| Instrumentos/estúdio (gear) | 808 (1980), microfone de fita (1932) | $1,98 mil · $155 | ok (preço de lista da época) |
| Tempo de estúdio | Estúdio profissional (por sessão) | $268 · $563 · $1,2 mil · $3,8 mil · $7 mil · $9 mil | ok |
| Salários (mês) | Produtor | $95 · $200 · $410 · $1,4 mil · $2,5 mil · $3,2 mil | ok (perto do salário qualificado de cada época) |
| Ingressos | Arena | $2 · $4 · $9 · $30 · $55 · $70 | aceitável — ver nota |

## Recalibragens (só outliers claros)

- **Fábrica própria** (`EQUIPMENT.own_plant`, `src/data/rules.ts`): 90 000 → 350 000 (US$ de 2020). Uma fábrica de
  prensagem custava o mesmo que um console de estúdio e menos que um ônibus de turnê em qualquer era; com −30% na
  prensagem para sempre, era compra óbvia. [INFERÊNCIA] Plantas pequenas com prensas usadas ficam na casa das
  centenas de milhares de dólares atuais; novas, milhões. 350 mil mantém a compra possível para um selo médio.
- **Console britânico de 1968** (`GEAR.g_console`, `src/sim/sys/music/data.ts`): 22 000 → 90 000. Em 1968 saía por
  ~$3,3 mil nominais; consoles de grande estúdio da época custavam dezenas de milhares. [INFERÊNCIA]
- **Placa de reverb de aço** (`GEAR.g_plate`): 7 000 → 20 000. Em 1957 saía por ~$800 nominais; a placa de reverb
  de estúdio era equipamento caro e pesado. [INFERÊNCIA]

## Notas sem mudança

- **Ingressos 1970–2000**: na escala do CPI a arena sai ~1,5–1,8× acima das médias históricas de bilheteria (os
  ingressos reais subiram mais que a inflação depois de ~1996). Como as faixas são por tamanho de casa (arena acima
  da média geral) e mexer no preço afeta toda a economia de shows (elasticidade por mercado da Rodada 20), ficou
  documentado e não alterado.
- **Ônibus de turnê** ($40 mil em 2020) é barato para um ônibus novo convertido, mas representa ônibus usado/fretado;
  consistente entre eras.

## Caixa reservado

Todo gasto do jogador (estrutura, sede, equipamento, negócios, compras e taxas) agora checa o **caixa livre**
(`freeCash20` = caixa − adiantamentos de ofertas pendentes). Quando só a reserva impede, o motivo diz quanto está
reservado e o que fazer (`cashWhy20`, `src/sim/oblig20.ts`). Exceção mantida: a parceria de TV (`tv18`), que tem
regra própria.

## Recoupment com teto (B29)

Quando o teto da trava libera o master sem recuperar, o saldo não recuperado é **perdoado de fato**
(`writeOffRecoup20`, `src/sim/rights.ts`): `recoupBalance` vai a zero (inclusive os baldes por projeto), o valor fica
em `recoupWrittenOff20` e o razão recebe uma linha "Saldo perdoado (sem efeito no caixa)" — o adiantamento já tinha
sido lançado como despesa quando foi pago.
